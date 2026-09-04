#     docker build --platform linux/amd64 \
#         -f Dockerfile -t f1-stream-worker .
#
# (Or just run ./push_to_ecr.sh, which does this from the folder.)

FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        python3 python3-venv ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# isloate dependencies 
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

WORKDIR /srv

COPY requirements.txt ./requirements.txt
RUN pip install --upgrade pip && pip install -r requirements.txt

# worker 
COPY stream_worker.py ./stream_worker.py


RUN useradd --create-home --uid 10001 worker
USER worker

# just run the stream_worker. 
CMD ["python", "stream_worker.py"]