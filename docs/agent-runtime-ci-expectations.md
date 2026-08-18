# CI expectations

Because PR #12 changes both `apps/api/**` and `db/migrations/**`, all existing integration workflows should trigger alongside the new Agent Knowledge Runtime lane. That is intentional: the agent runtime sits across principal/workspace permissions, Claims, CCP, Knowledge Events and Watch, so regression coverage must include every earlier layer.

Any implementation patch after the first CI run invalidates previous green results for release purposes; the full gate must be read again on the exact final head.
