const core = require("@actions/core");
const github = require("@actions/github");

const token = core.getInput("github-token", { required: true });
const releaseBranch = getBranch("release");
const devBranch = getBranch("dev");
const masterBranch = getBranch("master");

function getInput(name, fallback) {
    const input = core.getInput(name);
    return input || fallback;
}

function getBranch(name) {
    return getInput(name, name);
}

function getTarget(head) {
    switch (head) {
        case releaseBranch: return masterBranch;
        case masterBranch: return devBranch;
        default: return null;
    }
}

async function run() {
    const context = github.context,
        head = context.ref,
        base = getTarget(head);
    if (!base) {
        core.info(`Branch ${head} is neither ${masterBranch} or ${releaseBranch}. Skipping...`);
        return;
    }
    const owner = context.repo.owner,
        repo = context.repo.repo,
        client = new github.GitHub(token),
        creationResponse = await client.pulls.create({
            base,
            head,
            owner,
            repo,
            title: `${head} -> ${base}`,
        }),
        creationData = creationResponse.data,
        pull_number = creationData.number;
    core.info(`Pull request #${pull_number} created.`);
    const label = getInput("label", "gitflow");
    await client.issues.addLabels({
        issue_number: pull_number,
        labels: [label],
        owner,
        repo
    });
    core.info(`Label ${label} added to #${pull_number}.`);
    await client.pulls.createReview({
        event: "APPROVE",
        owner,
        pull_number,
        repo,
    });
    core.info(`Pull request #${pull_number} approved.`);
    await client.pulls.merge({
        owner,
        pull_number,
        repo,
    });
    core.info(`Pull request #${pull_number} merged.`);
}

run();
