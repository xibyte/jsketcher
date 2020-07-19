#!/usr/bin/env bash

cd `dirname "$0"`

aws s3 sync ./web/ s3://sketcher/
