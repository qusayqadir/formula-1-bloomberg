#!/usr/bin/env bash
set -euo pipefail


AWS_ACCOUNT_ID="<FILL_ME>"         
AWS_REGION="us-east-1"              
ECR_REPO="f1-stream-worker"         
IMAGE_TAG="latest"                 



SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ECR_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
IMAGE_URI="${ECR_URI}/${ECR_REPO}:${IMAGE_TAG}"

if [[ "$AWS_ACCOUNT_ID" == "<FILL_ME>" ]]; then
  echo "ERROR: set AWS_ACCOUNT_ID at the top of this script first." >&2
  exit 1
fi

cd "$SCRIPT_DIR"

# ecr 
aws ecr describe-repositories --repository-names "$ECR_REPO" --region "$AWS_REGION" >/dev/null 2>&1 \
  || aws ecr create-repository --repository-name "$ECR_REPO" --region "$AWS_REGION" >/dev/null

# push local docker to the ecr repo 
aws ecr get-login-password --region "$AWS_REGION" \
  | docker login --username AWS --password-stdin "$ECR_URI"

docker build --platform linux/amd64 -f Dockerfile -t "$IMAGE_URI" .

# push 
docker push "$IMAGE_URI"

echo ""
echo "Pushed: $IMAGE_URI"
echo "Use this URI as the containerDefinitions[].image in your Fargate task definition."
q