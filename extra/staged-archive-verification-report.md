# Staged Archive Verification Report

Generated: 2026-06-14T10:28:10.975Z

This report verifies whether every terminal staged file can be reconstructed without reading `data/staged-records/`: identical staged records come from current live files, and changed staged records come from the archive pack.

## Status

- Status: `pass`
- Issues: 0

## Summary

- Staged changes checked: 1200
- Reconstructed from live targets: 1008
- Reconstructed from archive bodies: 192
- Reconstructed total: 1200
- Archive entries: 192
- Legacy unstaged changes: 5
- Manifest: data/staged-record-manifests/terminal-bundles.v1.json
- Archive: data/staged-record-archives/changed-terminal-bodies.v1.json

## Reconstruction Sources

| Source | Count |
| --- | --- |
| from_live_target | 1008 |
| from_archive_body | 192 |

## Issue Counts

- None.

## Issue Examples

- None.

## Issues

- None.
