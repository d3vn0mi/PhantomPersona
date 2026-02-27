FROM python:3.11-slim

WORKDIR /app

COPY pyproject.toml config.yaml ./
COPY phantom_engine/ ./phantom_engine/
COPY src/ ./src/

RUN pip install --no-cache-dir --upgrade pip setuptools \
    && pip install --no-cache-dir .

EXPOSE 8000
CMD ["phantom-daemon", "--host", "0.0.0.0", "--port", "8000"]
