FROM node:22-bookworm-slim AS web
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM golang:1.25-bookworm AS build
WORKDIR /src
COPY go.mod ./
COPY cmd ./cmd
COPY internal ./internal
COPY --from=web /app/internal/web/dist ./internal/web/dist
RUN CGO_ENABLED=0 go build -trimpath -buildvcs=false -o /out/server ./cmd/server

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/server /server
EXPOSE 8090
ENTRYPOINT ["/server", "-addr", "0.0.0.0:8090"]
