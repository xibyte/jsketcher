#!/usr/bin/env bash

cd `dirname "$0"`

aws s3 sync out/ s3://sketcher/
