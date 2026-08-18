# PR #12 merge policy

Merge method: squash. Merge only from a Ready-for-Review, mergeable PR whose exact head SHA is the one validated by the full integration matrix. Use expected-head protection on the merge operation.

The squash commit should represent the capability as one architectural milestone: `Agent Knowledge Runtime`.
