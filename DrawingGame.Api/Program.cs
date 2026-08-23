using DrawingGame.Api.Game;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSignalR();
builder.Services.AddSingleton<GameManager>();
builder.Services.AddSingleton<DisconnectCleanup>();
builder.Services.AddSingleton<TimeProvider>(TimeProvider.System);
builder.Services.AddHostedService<GameLoopService>();

builder.Services.AddSingleton<WordList>(_ =>
{
    var path = Path.Combine(builder.Environment.ContentRootPath, "word-list.txt");

    return new WordList(path);
});

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.MapHub<GameHub>("/game");

app.Run();
