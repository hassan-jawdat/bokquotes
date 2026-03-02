using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;

namespace BookQuotes.Api;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Book> Books => Set<Book>();
    public DbSet<Quote> Quotes => Set<Quote>();
}

// ---- MODELLER i samma fil (för färre filer) ----
public class User
{
    public int Id { get; set; }
    public required string Username { get; set; }
    public required byte[] PasswordHash { get; set; }
    public required byte[] PasswordSalt { get; set; }
}

public class Book
{
    public int Id { get; set; }
    public required string Title { get; set; }
    public required string Author { get; set; }
    public DateOnly? PublishedDate { get; set; }
    public int UserId { get; set; }
}

public class Quote
{
    public int Id { get; set; }
    public required string Text { get; set; }
    public string? Source { get; set; }
    public int UserId { get; set; }
}
