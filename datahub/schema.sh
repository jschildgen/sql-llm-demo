#!/bin/bash

pg_dump -s -U datahub datahub | grep -v ^-- | tr "\\n" "~" | sed 's/\~    / /g' | tr "~" "\\n" | grep "^CREATE TABLE"
