Current branch: !`git branch --show-current`
Git status: !`git status`
Staged diff: !`git diff --cached`
Unstaged diff: !`git diff`
Recent commits: !`git log --oneline -5`

Based on the changes above:
1. Create a commit with a descriptive message (if there are staged or unstaged changes)
2. Push the branch to origin
3. Create a pull request using `gh pr create` with:
   - A clear title summarizing the changes
   - A body with a Summary section (bullet points) and Test Plan section
