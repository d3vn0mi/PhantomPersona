from fastapi import FastAPI

app = FastAPI(title="PhantomPersona Daemon")


@app.get("/health")
def health():
    return {"status": "ok"}


def start():
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)


if __name__ == "__main__":
    start()
