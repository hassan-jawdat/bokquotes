using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace BookQuotes.Api;

// ---- DTOs (data som skickas till/från API) ----
public record RegisterDto(string Username, string Password);
public record LoginDto(string Username, string Password);
public record AuthResponseDto(string Token, string Username);

// ---- JWT settings ----
public class JwtOptions
{
    public required string Issuer { get; set; }
    public required string Audience { get; set; }
    public required string Key { get; set; }
    public int ExpMinutes { get; set; } = 120;
}

// ---- Password hashing ----
public static class PasswordHasher
{
    public static (byte[] hash, byte[] salt) Hash(string password)
    {
        using var hmac = new HMACSHA256();
        var salt = hmac.Key;
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(password));
        return (hash, salt);
    }

    public static bool Verify(string password, byte[] storedHash, byte[] storedSalt)
    {
        using var hmac = new HMACSHA256(storedSalt);
        var computed = hmac.ComputeHash(Encoding.UTF8.GetBytes(password));
        return CryptographicOperations.FixedTimeEquals(computed, storedHash);
    }
}

// ---- Token service ----
public class JwtTokenService(IOptions<JwtOptions> opt)
{
    private readonly JwtOptions _jwt = opt.Value;

    public string CreateToken(User user)
    {
        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.UniqueName, user.Username),
            new Claim(ClaimTypes.Name, user.Username),
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwt.Key));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: _jwt.Issuer,
            audience: _jwt.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(_jwt.ExpMinutes),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

// ================== Controllers ==================

// AUTH
[ApiController]
[Route("api/auth")]
public class AuthController(AppDbContext db, JwtTokenService jwt) : ControllerBase
{
    [HttpPost("register")]
    public async Task<ActionResult> Register(RegisterDto dto)
    {
        var username = dto.Username.Trim();
        if (username.Length < 2) return BadRequest("Username too short.");
        if (dto.Password.Length < 4) return BadRequest("Password too short (min 4).");

        var exists = await db.Users.AnyAsync(u => u.Username == username);
        if (exists) return BadRequest("Username already exists.");

        var (hash, salt) = PasswordHasher.Hash(dto.Password);

        db.Users.Add(new User { Username = username, PasswordHash = hash, PasswordSalt = salt });
        await db.SaveChangesAsync();
        return Ok();
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponseDto>> Login(LoginDto dto)
    {
        var user = await db.Users.SingleOrDefaultAsync(u => u.Username == dto.Username.Trim());
        if (user is null) return Unauthorized("Invalid credentials.");

        var ok = PasswordHasher.Verify(dto.Password, user.PasswordHash, user.PasswordSalt);
        if (!ok) return Unauthorized("Invalid credentials.");

        var token = jwt.CreateToken(user);
        return Ok(new AuthResponseDto(token, user.Username));
    }
}

// BOOKS CRUD (JWT required)
[ApiController]
[Route("api/books")]
[Authorize]
public class BooksController(AppDbContext db) : ControllerBase
{
    private int UserId
    {
        get
        {
            var userIdValue =
                User.FindFirstValue(ClaimTypes.NameIdentifier) ??
                User.FindFirstValue(JwtRegisteredClaimNames.Sub);

            if (!int.TryParse(userIdValue, out var userId))
                throw new UnauthorizedAccessException("Missing or invalid user id claim.");

            return userId;
        }
    }

    [HttpGet]
    public async Task<List<Book>> GetAll() =>
        await db.Books.AsNoTracking()
            .Where(b => b.UserId == UserId)
            .OrderByDescending(b => b.Id)
            .ToListAsync();

    [HttpGet("{id:int}")]
    public async Task<ActionResult<Book>> GetById(int id)
    {
        var book = await db.Books.AsNoTracking()
            .SingleOrDefaultAsync(b => b.Id == id && b.UserId == UserId);
        return book is null ? NotFound() : Ok(book);
    }

    [HttpPost]
    public async Task<ActionResult<Book>> Create(Book book)
    {
        book.UserId = UserId;
        db.Books.Add(book);
        await db.SaveChangesAsync();
        return Ok(book);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult> Update(int id, Book updated)
    {
        var book = await db.Books.SingleOrDefaultAsync(b => b.Id == id && b.UserId == UserId);
        if (book is null) return NotFound();

        book.Title = updated.Title;
        book.Author = updated.Author;
        book.PublishedDate = updated.PublishedDate;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult> Delete(int id)
    {
        var book = await db.Books.SingleOrDefaultAsync(b => b.Id == id && b.UserId == UserId);
        if (book is null) return NotFound();

        db.Books.Remove(book);
        await db.SaveChangesAsync();
        return NoContent();
    }
}

// QUOTES CRUD (JWT required + max 5 per user)
[ApiController]
[Route("api/quotes")]
[Authorize]
public class QuotesController(AppDbContext db) : ControllerBase
{
    private int UserId
    {
        get
        {
            var userIdValue =
                User.FindFirstValue(ClaimTypes.NameIdentifier) ??
                User.FindFirstValue(JwtRegisteredClaimNames.Sub);

            if (!int.TryParse(userIdValue, out var userId))
                throw new UnauthorizedAccessException("Missing or invalid user id claim.");

            return userId;
        }
    }

    [HttpGet]
    public async Task<List<Quote>> GetMine() =>
        await db.Quotes.AsNoTracking()
            .Where(q => q.UserId == UserId)
            .OrderByDescending(q => q.Id)
            .ToListAsync();

    [HttpPost]
    public async Task<ActionResult> Create(Quote quote)
    {
        var count = await db.Quotes.CountAsync(q => q.UserId == UserId);
        if (count >= 5) return BadRequest("Max 5 quotes allowed.");

        quote.UserId = UserId;
        db.Quotes.Add(quote);
        await db.SaveChangesAsync();
        return Ok(quote);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult> Update(int id, Quote updated)
    {
        var quote = await db.Quotes.SingleOrDefaultAsync(q => q.Id == id && q.UserId == UserId);
        if (quote is null) return NotFound();

        quote.Text = updated.Text;
        quote.Source = updated.Source;
        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpDelete("{id:int}")]
    public async Task<ActionResult> Delete(int id)
    {
        var quote = await db.Quotes.SingleOrDefaultAsync(q => q.Id == id && q.UserId == UserId);
        if (quote is null) return NotFound();

        db.Quotes.Remove(quote);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
