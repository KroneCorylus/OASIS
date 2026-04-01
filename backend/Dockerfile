# ── dev stage ─────────────────────────────────────────────────────────────────
FROM golang:1.25-alpine AS dev
RUN apk add --no-cache git && \
    go install github.com/air-verse/air@latest
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
CMD ["air"]

# ── build stage ───────────────────────────────────────────────────────────────
FROM golang:1.25-alpine AS build
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /app/server .

# ── prod stage ────────────────────────────────────────────────────────────────
FROM alpine:3.20 AS prod
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=build /app/server /app/server
EXPOSE 8080
CMD ["/app/server"]
