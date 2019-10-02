/*
   Given an input file (the result from `commit-history.sh`, this script will output how the size of a given file across
   commits.

   Useful references:
   - how to list name changes throughout commit history: https://stackoverflow.com/a/13620202/778272
   - how to count lines for each point in time: https://stackoverflow.com/a/57745129/778272
 */

const
    util = require("util"),
    exec = require("child_process").exec,
    fs = require("fs");

const execSync = util.promisify(exec);

class Change {
    /** @type {String} */
    commit;
    /** @type {String} */
    author;
    /** @type {String} */
    date;
    /** @type {String} */
    message;
    /** @type {String} */
    fileName;
    /** @type {Number} */
    lineCount;

    toString() {
        return `${this.date}\t${this.lineCount}\t${this.commit}\t${this.message}`;
    }
}

class CountLines {

    static INPUT_FILE_NAME = "commit-history.txt";
    static COMMIT_REGEX = /^commit\s(.*)/;
    static AUTHOR_REGEX = /^author\s(.*)/;
    static DATE_REGEX = /^date\s(.*)/;
    static MESSAGE_REGEX = /^message\s(.*)/;

    currentCommit = "";
    currentAuthor = "";
    currentDate = "";
    currentMessage = "";
    /** @type {Change[]} */
    changes = [];

    /** @return {void} */
    async run(repositoryRootDir) {
        if (!repositoryRootDir) {
            console.error("Missing root dir");
            process.exit(1);
        }

        const text = fs.readFileSync(CountLines.INPUT_FILE_NAME, "utf-8");

        for (const line of text.split("\n")) {
            this.tryCommit(line) || this.tryAuthor(line) || this.tryDate(line) || this.tryMessage(line) || this.tryFileName(line);
        }

        // oldest first
        this.changes = this.changes.reverse();

        process.chdir(repositoryRootDir);

        for (const change of this.changes) {
            change.lineCount = await this.obtainLineCount(change.commit, change.fileName);
            console.info(change.toString());
        }
    }

    async obtainLineCount(hash, fileName) {
        const cmd = `git cat-file blob ${hash}:${fileName} | wc -l`;
        const {stdout} = await execSync(cmd);
        return parseInt(stdout);
    }

    tryCommit(line) {
        const result = CountLines.COMMIT_REGEX.exec(line);
        if (result) {
            this.currentCommit = result[1];
        }
        return !!result;
    }

    tryAuthor(line) {
        const result = CountLines.AUTHOR_REGEX.exec(line);
        if (result) {
            this.currentAuthor = result[1];
        }
        return !!result;
    }

    tryDate(line) {
        const result = CountLines.DATE_REGEX.exec(line);
        if (result) {
            this.currentDate = result[1];
        }
        return !!result;
    }

    tryMessage(line) {
        const result = CountLines.MESSAGE_REGEX.exec(line);
        if (result) {
            this.currentMessage = result[1];
        }
        return !!result;
    }

    tryFileName(line) {
        if (line.length > 0) {
            const change = new Change();
            change.fileName = line;

            change.commit = this.currentCommit;
            change.author = this.currentAuthor;
            change.date = this.currentDate;
            change.message = this.currentMessage;

            this.changes.push(change);
        }
    }
}

(new CountLines()).run(process.argv[2]);
