FROM python:3.11-slim

WORKDIR /app

COPY pyproject.toml ./
RUN pip install --no-cache-dir --upgrade pip setuptools \
    && pip install --no-cache-dir .

COPY src/ ./src/
RUN pip install --no-cache-dir -e .

EXPOSE 8000
CMD ["uvicorn", "phantom_daemon.main:app", "--host", "0.0.0.0", "--port", "8000"]
