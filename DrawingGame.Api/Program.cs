using DrawingGame.Api.Game;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSignalR();
builder.Services.AddSingleton<GameManager>();
builder.Services.AddSingleton<DisconnectCleanup>();
builder.Services.AddSingleton<TimeProvider>(TimeProvider.System);
builder.Services.AddHostedService<GameLoopService>();

builder.Services.AddSingleton<WordList>(_ =>
{
    var path = Path.Combine(AppContext.BaseDirectory, "word-list.txt");

    return new WordList(path);
});

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapGet("/healthz", () => Results.Ok());
app.MapHub<GameHub>("/game");
app.MapFallbackToFile("index.html");

app.Run();
