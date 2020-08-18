const {KiteTestError, Status, TestUtils} = require('kite-common');
const AppTestStep = require('../utils/AppTestStep');

class ScreenViewingCheck extends AppTestStep {
  constructor(kiteBaseTest, sessionInfo, testType, metricName) {
    super(kiteBaseTest, sessionInfo);
    this.expectedState = testType === 'SCREEN_SHARING_ON' ? 'video' : 'blank';
    this.metric = metricName;
  }

  static async executeStep(KiteBaseTest, sessionInfo, testType, metricName) {
    const step = new ScreenViewingCheck(KiteBaseTest, sessionInfo, testType, metricName);
    await step.execute(KiteBaseTest);
  }

  stepDescription() {
    return 'Check the screen view to be: ' + this.expectedState;
  }

  metricName() {
    return this.metric;
  }

  async run() {
    await TestUtils.waitAround(5000);
    try {
      let result = await this.page.checkScreenShare(this.expectedState);
      if (result !== this.expectedState) {
        this.testReporter.textAttachment(this.report, 'Shared screen', result, 'plain');
        throw new KiteTestError(Status.FAILED, 'Screen share test: ' + result);
      }
    } catch (error) {
      this.logger(error);
      if (error instanceof KiteTestError) {
        throw error;
      } else {
        throw new KiteTestError(Status.BROKEN, 'Error looking for shared screen');
      }
    }
    this.finished(`screen_viewing_${this.expectedState == 'video' ? 'on' : 'off'}`)
  }
}

module.exports = ScreenViewingCheck;
