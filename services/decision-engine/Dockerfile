
FROM python:3.12-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

COPY services/decision-engine/requirements.txt ./requirements.txt

RUN pip install --no-cache-dir -r requirements.txt

COPY services/decision-engine/app ./app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"]

