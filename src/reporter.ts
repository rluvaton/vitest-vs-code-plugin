import {Awaitable, Reporter, UserConsoleLog, Vitest} from "vitest";
import {File, TaskResultPack} from "@vitest/runner";

export default class CustomReporter implements Reporter {
    onInit(ctx: Vitest): void {
        console.log('onInit', ctx)
    }

    onPathsCollected(paths?: string[]) {
        console.log('onPathsCollected', paths)
    };

    onCollected(files?: File[]) {
        console.log('onCollected', files)
    }

    onFinished(files?: File[], errors?: unknown[]) {
        console.log('onFinished', files, errors)
    }

    onTaskUpdate(packs: TaskResultPack[]) {
        console.log('onTaskUpdate', packs)
    }

    onTestRemoved(trigger?: string) {
        console.log('onTestRemoved', trigger)
    }

    onWatcherStart(files?: File[], errors?: unknown[]) {
        console.log('onWatcherStart', files, errors)
    }

    onWatcherRerun(files: string[], trigger?: string) {
        console.log('onWatcherRerun', files, trigger)
    }

    onServerRestart(reason?: string) {
        console.log('onServerRestart', reason)
    }

    onUserConsoleLog(log: UserConsoleLog) {
        console.log('onUserConsoleLog', log)
    }

    onProcessTimeout() {
        console.log('onProcessTimeout')
    }
}
