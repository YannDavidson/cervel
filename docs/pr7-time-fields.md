# Connector time fields

`last_checked_at` records attempted observation, `last_success_at` records successful refresh, `last_changed_at` records when CERVEL last observed changed bytes, `last_remote_modified_at` preserves provider metadata, and `next_sync_at` drives automation. These timestamps answer different operational questions and should remain distinct.
