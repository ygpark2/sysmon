STACK_NAME ?= ovs
ENV_FILE ?= .env
STACK_FILE ?= deploy/stack.yml
CLIENT_STACK_FILE ?= deploy/stack.client.yml
OVS_NETWORK ?= $(STACK_NAME)_observability
