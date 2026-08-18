# Agent Runtime test plan

The dedicated CI lane runs the full TypeScript build, existing Jest suite, every migration through 021, and normal CERVEL bootstrap. It then validates the new schema and executes a real database behavior test.

The behavior test creates a service principal and external agent identity, grants one Workspace, writes an observation with a Claim, verifies agent/Workspace provenance on the Claim, and attempts the same principal against a second Workspace without a grant. The second access must fail.

The workflow also checks that the compiled runtime calls the existing CCP assembler and reads the existing Knowledge Event and Watch alert stores. Existing integration workflows run because PR #12 changes API and migrations, providing the regression gate across prior CERVEL layers.
