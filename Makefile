.PHONY: syntax
syntax:
	hugo gen chromastyles --style=friendly > assets/css/_syntax.scss
