.PHONY: clean
clean:
	npm run --workspaces clean

.PHONY: distclean
distclean: clean
	rm -rf node_modules packages/*/node_modules
