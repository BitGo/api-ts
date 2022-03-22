.PHONY: clean
clean:
	npm run --workspaces clean

.PHONY: distclean
distclean: clean
	rm -rf node_modules packages/*/node_modules

.PHONY: lint-drone
lint-drone: .drone.yml
	drone lint --trusted

.drone.yml: .drone.jsonnet
	@touch .drone.yml
	@chmod 0600 .drone.yml
	drone jsonnet --stream
	@chmod 0400 .drone.yml
