#!/bin/sh
npm run build
gem build inferno_core.gemspec
gem push inferno_core*.gem
