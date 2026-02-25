STACK_NAME ?= obs
ENV_FILE ?= .env
STACK_FILE ?= deploy/stack.yml
CLIENT_STACK_FILE ?= deploy/stack.client.yml
OBS_NETWORK ?= $(STACK_NAME)_observability
