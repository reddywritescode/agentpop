FROM golang:1.23-bookworm AS build

WORKDIR /src
COPY go.mod ./
RUN go mod download
COPY cmd ./cmd
COPY internal ./internal
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" \
    -o /out/agentpop-control-plane ./cmd/control-plane

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/agentpop-control-plane /usr/local/bin/agentpop-control-plane
EXPOSE 8080
USER nonroot:nonroot
ENTRYPOINT ["/usr/local/bin/agentpop-control-plane"]
