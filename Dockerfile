# Build the React frontend.
FROM node:22-alpine AS frontend

WORKDIR /src/client

COPY DrawingGame.Client/package*.json ./
RUN npm ci

COPY DrawingGame.Client/ ./
RUN npm run build

# Publish the ASP.NET Core backend.
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS backend

WORKDIR /src

COPY DrawingGame.Api/DrawingGame.Api.csproj DrawingGame.Api/
RUN dotnet restore DrawingGame.Api/DrawingGame.Api.csproj

COPY DrawingGame.Api/ DrawingGame.Api/
RUN dotnet publish DrawingGame.Api/DrawingGame.Api.csproj \
    -c Release \
    -o /app/publish \
    --no-restore

# Combine the published backend and compiled frontend in the runtime image.
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final

WORKDIR /app

COPY --from=backend /app/publish ./
COPY --from=frontend /src/client/dist ./wwwroot

ENV ASPNETCORE_URLS=http://0.0.0.0:8080

EXPOSE 8080

ENTRYPOINT ["dotnet", "DrawingGame.Api.dll"]
