FROM golang:1.23-bookworm AS build

WORKDIR /src
COPY go.mod ./
RUN go mod download
COPY cmd ./cmd
COPY internal ./internal
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" \
    -o /out/agentpop-host-agent ./cmd/host-agent

FROM docker:27-cli
RUN apk add --no-cache ca-certificates openssh-client
COPY --from=build /out/agentpop-host-agent /usr/local/bin/agentpop-host-agent
EXPOSE 9090
ENTRYPOINT ["/usr/local/bin/agentpop-host-agent"]
