# Provider fetch boundary

Unlike PR #6 web clips, connector fetches are not arbitrary user-supplied URLs. The runtime calls fixed Google/Dropbox/Microsoft API hosts and interpolates only provider remote IDs into known endpoints, preserving the no-generic-SSRF boundary.
