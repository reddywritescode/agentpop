FROM golang:1.23-alpine AS build
WORKDIR /src
COPY go.mod main.go ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/agentpop-mcp .

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/agentpop-mcp /agentpop-mcp
ENTRYPOINT ["/agentpop-mcp"]
