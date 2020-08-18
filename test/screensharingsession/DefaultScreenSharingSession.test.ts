// Copyright 2019-2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { Arg, Substitute } from '@fluffy-spoon/substitute';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';

import DefaultBrowserBehavior from '../../src/browserbehavior/DefaultBrowserBehavior';
import DOMWebSocket from '../../src/domwebsocket/DOMWebSocket';
import LogLevel from '../../src/logger/LogLevel';
import NoOpLogger from '../../src/logger/NoOpLogger';
import Maybe from '../../src/maybe/Maybe';
import MediaRecordingFactory from '../../src/mediarecording/MediaRecordingFactory';
import MediaStreamBroker from '../../src/mediastreambroker/MediaStreamBroker';
import DefaultPromisedWebSocket from '../../src/promisedwebsocket/DefaultPromisedWebSocket';
import PromisedWebSocket from '../../src/promisedwebsocket/PromisedWebSocket';
import ScreenShareStreaming from '../../src/screensharestreaming/ScreenShareStreaming';
import ScreenShareStreamingFactory from '../../src/screensharestreaming/ScreenShareStreamingFactory';
import ScreenSharingMessage from '../../src/screensharingmessage/ScreenSharingMessage';
import ScreenSharingMessageType from '../../src/screensharingmessage/ScreenSharingMessageType';
import ScreenSharingMessageSerialization from '../../src/screensharingmessageserialization/ScreenSharingMessageSerialization';
import DefaultScreenSharingSession from '../../src/screensharingsession/DefaultScreenSharingSession';
import ScreenSharingSessionObserver from '../../src/screensharingsession/ScreenSharingSessionObserver';
import PromisedWebSocketMock from '../promisedwebsocketmock/PromisedWebSocketMock';
import ScreenShareStreamingMock from '../screensharestreamingmock/ScreenShareStreamingMock';

describe('DefaultScreenSharingSession', function() {
  const timeSliceMs = 100;
  const messageSerialization = Substitute.for<ScreenSharingMessageSerialization>();
  const logging = new NoOpLogger(LogLevel.DEBUG);
  const constraintsProvider = (): MediaStreamConstraints => ({});
  const promisedWebSocket = Substitute.for<PromisedWebSocket>();
  const mediaStreamBroker = Substitute.for<MediaStreamBroker>();
  const screenSharingStreamFactory = Substitute.for<ScreenShareStreamingFactory>();
  const mediaRecordingFactory = Substitute.for<MediaRecordingFactory>();
  const browserBehavior = Substitute.for<DefaultBrowserBehavior>();

  before(() => {
    chai.should();
    chai.use(chaiAsPromised);
  });

  describe('#open', () => {
    describe('with open', () => {
      it('is fulfilled', (done: Mocha.Done) => {
        const promisedWebSocket = new PromisedWebSocketMock();
        const subject = new DefaultScreenSharingSession(
          promisedWebSocket,
          constraintsProvider,
          timeSliceMs,
          messageSerialization,
          mediaStreamBroker,
          screenSharingStreamFactory,
          mediaRecordingFactory,
          logging
        );
        subject.open(1000).should.eventually.be.fulfilled.and.notify(done);
      });
    });

    it('notxifies', (done: Mocha.Done) => {
      const promisedWebSocket = new PromisedWebSocketMock();
      const subject = new DefaultScreenSharingSession(
        promisedWebSocket,
        constraintsProvider,
        timeSliceMs,
        messageSerialization,
        mediaStreamBroker,
        screenSharingStreamFactory,
        mediaRecordingFactory,
        logging
      );
      const observer: ScreenSharingSessionObserver = {
        didOpen(_event: Event): void {
          done();
        },
      };
      subject.registerObserver(observer);
      subject.open(1000).should.eventually.be.fulfilled;
    });

    describe('with error', () => {
      it('is rejected', (done: Mocha.Done) => {
        const promisedWebSocket = Substitute.for<PromisedWebSocket>();
        const subject = new DefaultScreenSharingSession(
          promisedWebSocket,
          constraintsProvider,
          timeSliceMs,
          messageSerialization,
          mediaStreamBroker,
          screenSharingStreamFactory,
          mediaRecordingFactory,
          logging
        );
        const event = Substitute.for<Event>();
        event.type.returns('error');
        promisedWebSocket.open(Arg.any()).returns(Promise.reject(event));
        promisedWebSocket.url.returns('');
        subject.open(1000).should.eventually.be.rejected.and.notify(done);
      });
    });

    describe('reconnect', () => {
      it('notifies', (done: Mocha.Done) => {
        const promisedWebSocket = new PromisedWebSocketMock();
        const subject = new DefaultScreenSharingSession(
          promisedWebSocket,
          constraintsProvider,
          timeSliceMs,
          messageSerialization,
          mediaStreamBroker,
          screenSharingStreamFactory,
          mediaRecordingFactory,
          logging
        );
        const observer: ScreenSharingSessionObserver = {
          willReconnect(): void {
            done();
          },
        };
        subject.registerObserver(observer);
        subject.open(1000).then(() => {
          const event = Substitute.for<Event>();
          event.type.returns('reconnect');
          promisedWebSocket.dispatchEvent(event);
        });
      });
    });

    describe('closing', () => {
      it('notifies', (done: Mocha.Done) => {
        const promisedWebSocket = new PromisedWebSocketMock();
        const subject = new DefaultScreenSharingSession(
          promisedWebSocket,
          constraintsProvider,
          timeSliceMs,
          messageSerialization,
          mediaStreamBroker,
          screenSharingStreamFactory,
          mediaRecordingFactory,
          logging
        );
        const closeEvent = Substitute.for<CloseEvent>();
        closeEvent.type.returns('close');
        const observer: ScreenSharingSessionObserver = {
          didClose(event: Event): void {
            chai.expect(event).to.eq(closeEvent);
            done();
          },
        };
        subject.registerObserver(observer);
        subject.open(1000).then(() => {
          promisedWebSocket.dispatchEvent(closeEvent);
        });
        const event = Substitute.for<Event>();
        event.type.returns('open');
        promisedWebSocket.dispatchEvent(event);
      });

      describe('normal', () => {
        it('is handled', (done: Mocha.Done) => {
          const promisedWebSocket = new PromisedWebSocketMock();
          const subject = new DefaultScreenSharingSession(
            promisedWebSocket,
            constraintsProvider,
            timeSliceMs,
            messageSerialization,
            mediaStreamBroker,
            screenSharingStreamFactory,
            mediaRecordingFactory,
            logging
          );
          subject.open(1000).then(() => {
            const event = Substitute.for<CloseEvent>();
            event.type.returns('close');
            event.code.returns(1000);
            promisedWebSocket.dispatchEvent(event);
            done();
          });
          const event = Substitute.for<Event>();
          event.type.returns('open');
          promisedWebSocket.dispatchEvent(event);
        });
      });

      describe('abnormal', () => {
        it('is handled', (done: Mocha.Done) => {
          const promisedWebSocket = new PromisedWebSocketMock();
          const subject = new DefaultScreenSharingSession(
            promisedWebSocket,
            constraintsProvider,
            timeSliceMs,
            messageSerialization,
            mediaStreamBroker,
            screenSharingStreamFactory,
            mediaRecordingFactory,
            logging
          );
          subject.open(1000).then(() => {
            const event = Substitute.for<CloseEvent>();
            event.type.returns('close');
            event.code.returns(1001);
            promisedWebSocket.dispatchEvent(event);
            done();
          });
          const event = Substitute.for<Event>();
          event.type.returns('open');
          promisedWebSocket.dispatchEvent(event);
        });
      });
    });
  });

  describe('#close', () => {
    describe('with close', () => {
      it('is fulfilled', (done: Mocha.Done) => {
        const promisedWebSocket = Substitute.for<PromisedWebSocket>();
        const subject = new DefaultScreenSharingSession(
          promisedWebSocket,
          constraintsProvider,
          timeSliceMs,
          messageSerialization,
          mediaStreamBroker,
          screenSharingStreamFactory,
          mediaRecordingFactory,
          logging
        );
        const event = Substitute.for<Event>();
        event.type.returns('close');
        promisedWebSocket.close(Arg.any()).returns(Promise.resolve(event));
        subject.close(1000).should.eventually.be.fulfilled.and.notify(done);
      });

      it('notifies', (done: Mocha.Done) => {
        const promisedWebSocket = Substitute.for<PromisedWebSocket>();
        const subject = new DefaultScreenSharingSession(
          promisedWebSocket,
          constraintsProvider,
          timeSliceMs,
          messageSerialization,
          mediaStreamBroker,
          screenSharingStreamFactory,
          mediaRecordingFactory,
          logging
        );
        promisedWebSocket.close(Arg.any()).returns(Promise.resolve(Substitute.for<CloseEvent>()));
        const observer: ScreenSharingSessionObserver = {
          didClose(): void {
            done();
          },
        };
        subject.registerObserver(observer);
        subject.close(1000).should.eventually.be.fulfilled;
      });
    });

    describe('with error', () => {
      it('is rejected', (done: Mocha.Done) => {
        const promisedWebSocket = Substitute.for<PromisedWebSocketMock>();
        const subject = new DefaultScreenSharingSession(
          promisedWebSocket,
          constraintsProvider,
          timeSliceMs,
          messageSerialization,
          mediaStreamBroker,
          screenSharingStreamFactory,
          mediaRecordingFactory,
          logging
        );
        const event = Substitute.for<ErrorEvent>();
        promisedWebSocket.close(Arg.any()).returns(Promise.reject(event));
        subject.close(1000).should.eventually.be.rejected.and.notify(done);
        promisedWebSocket.dispatchEvent(event);
      });
    });
  });

  describe('message callback', () => {
    describe('with send error', () => {
      it('is fulfilled', (done: Mocha.Done) => {
        const promisedWebSocket = Substitute.for<PromisedWebSocket>();
        const mediaStreamBroker = Substitute.for<MediaStreamBroker>();
        const stream = new ScreenShareStreamingMock();
        const screenSharingStreamFactory = Substitute.for<ScreenShareStreamingFactory>();
        const subject = new DefaultScreenSharingSession(
          promisedWebSocket,
          constraintsProvider,
          timeSliceMs,
          messageSerialization,
          mediaStreamBroker,
          screenSharingStreamFactory,
          mediaRecordingFactory,
          logging
        );
        const error = new Error();
        const observer: ScreenSharingSessionObserver = {
          didFailSend(e: Error): void {
            chai.expect(e).to.eq(error);
            done();
          },
        };
        promisedWebSocket.send(Arg.all()).mimicks(() => {
          throw error;
        });
        mediaStreamBroker
          .acquireDisplayInputStream(Arg.any())
          .returns(Promise.resolve(Substitute.for<MediaStream>()));
        screenSharingStreamFactory.create(Arg.any()).returns(stream);
        subject.registerObserver(observer);
        subject.start(null, 0).then(() => {
          const event = Substitute.for<CustomEvent>();
          event.type.returns('message');
          stream.dispatchEvent(event);
        });
      });
    });

    it('is fulfilled', (done: Mocha.Done) => {
      const promisedWebSocket = Substitute.for<PromisedWebSocket>();
      const mediaStreamBroker = Substitute.for<MediaStreamBroker>();
      const stream = new ScreenShareStreamingMock();
      const screenSharingStreamFactory = Substitute.for<ScreenShareStreamingFactory>();
      const subject = new DefaultScreenSharingSession(
        promisedWebSocket,
        constraintsProvider,
        timeSliceMs,
        messageSerialization,
        mediaStreamBroker,
        screenSharingStreamFactory,
        mediaRecordingFactory,
        logging
      );
      mediaStreamBroker
        .acquireDisplayInputStream(Arg.any())
        .returns(Promise.resolve(Substitute.for<MediaStream>()));
      screenSharingStreamFactory.create(Arg.any()).returns(stream);
      subject.start(null, 0).then(() => {
        const event = Substitute.for<CustomEvent>();
        event.type.returns('message');
        stream.dispatchEvent(event);
        done();
      });
    });
  });

  describe('#start', () => {
    describe('without started', () => {
      it('is fulfilled', (done: Mocha.Done) => {
        const observer = Substitute.for<ScreenSharingSessionObserver>();
        const promisedWebSocket = Substitute.for<PromisedWebSocket>();
        const mediaStreamBroker = Substitute.for<MediaStreamBroker>();
        const subject = new DefaultScreenSharingSession(
          promisedWebSocket,
          constraintsProvider,
          timeSliceMs,
          messageSerialization,
          mediaStreamBroker,
          screenSharingStreamFactory,
          mediaRecordingFactory,
          logging
        ).registerObserver(observer);
        mediaStreamBroker
          .acquireDisplayInputStream(Arg.any())
          .returns(Promise.resolve(Substitute.for<MediaStream>()));
        subject.start(null, 0).should.eventually.be.fulfilled.and.notify(() => {
          observer.received().didStartScreenSharing();
          done();
        });
      });

      describe('with timeout', () => {
        it('is rejected', (done: Mocha.Done) => {
          const observer = Substitute.for<ScreenSharingSessionObserver>();
          const promisedWebSocket = Substitute.for<PromisedWebSocket>();
          const mediaStreamBroker = Substitute.for<MediaStreamBroker>();
          const subject = new DefaultScreenSharingSession(
            promisedWebSocket,
            constraintsProvider,
            timeSliceMs,
            messageSerialization,
            mediaStreamBroker,
            screenSharingStreamFactory,
            mediaRecordingFactory,
            logging
          ).registerObserver(observer);
          mediaStreamBroker
            .acquireDisplayInputStream(Arg.any())
            .returns(Promise.resolve(Substitute.for<MediaStream>()));
          subject.start(null, 1).should.eventually.be.rejected.and.notify(() => {
            done();
          });
        });
      });
    });

    describe('with started', () => {
      it('is rejected', (done: Mocha.Done) => {
        const promisedWebSocket = Substitute.for<PromisedWebSocket>();
        const mediaStreamBroker = Substitute.for<MediaStreamBroker>();
        const subject = new DefaultScreenSharingSession(
          promisedWebSocket,
          constraintsProvider,
          timeSliceMs,
          messageSerialization,
          mediaStreamBroker,
          screenSharingStreamFactory,
          mediaRecordingFactory,
          logging
        );
        mediaStreamBroker
          .acquireDisplayInputStream(Arg.any())
          .returns(Promise.resolve(Substitute.for<MediaStream>()));
        subject.start(null, 0).then(() => {
          subject.start(null, 0).should.eventually.be.rejected.and.notify(done);
        });
      });
    });

    describe('with Safari', () => {
      it('is rejected', (done: Mocha.Done) => {
        browserBehavior.screenShareUnsupported().returns(true);
        const subject = new DefaultScreenSharingSession(
          promisedWebSocket,
          constraintsProvider,
          timeSliceMs,
          messageSerialization,
          mediaStreamBroker,
          screenSharingStreamFactory,
          mediaRecordingFactory,
          logging,
          browserBehavior
        );
        subject.start(null, 0).should.eventually.be.rejected.and.notify(done);
        mediaStreamBroker.didNotReceive();
      });
    });
  });

  describe('#stop', () => {
    describe('with start', () => {
      it('is fulfilled', (done: Mocha.Done) => {
        const observer = Substitute.for<ScreenSharingSessionObserver>();
        const promisedWebSocket = Substitute.for<PromisedWebSocket>();
        const mediaStreamBroker = Substitute.for<MediaStreamBroker>();
        const stream = new ScreenShareStreamingMock();
        const screenSharingStreamFactory = Substitute.for<ScreenShareStreamingFactory>();
        const subject = new DefaultScreenSharingSession(
          promisedWebSocket,
          constraintsProvider,
          timeSliceMs,
          messageSerialization,
          mediaStreamBroker,
          screenSharingStreamFactory,
          mediaRecordingFactory,
          logging
        ).registerObserver(observer);
        screenSharingStreamFactory.create(Arg.any()).returns(stream);
        mediaStreamBroker
          .acquireDisplayInputStream(Arg.any())
          .returns(Promise.resolve(Substitute.for<MediaStream>()));
        subject.start(null, 0).then(() => {
          subject.stop().should.eventually.be.fulfilled.and.notify(() => {
            observer.received().didStopScreenSharing();
            done();
          });
        });
      });
    });
    describe('without start', () => {
      it('is rejected', (done: Mocha.Done) => {
        const promisedWebSocket = new DefaultPromisedWebSocket(Substitute.for<DOMWebSocket>());
        const subject = new DefaultScreenSharingSession(
          promisedWebSocket,
          constraintsProvider,
          timeSliceMs,
          messageSerialization,
          mediaStreamBroker,
          screenSharingStreamFactory,
          mediaRecordingFactory,
          logging
        );
        subject.stop().should.eventually.be.rejected.and.notify(done);
      });
    });
  });

  describe('onMessage', () => {
    describe('with unknown type', () => {
      it('is not dispatched', (done: Mocha.Done) => {
        const messageSerialization = Substitute.for<ScreenSharingMessageSerialization>();
        const message: ScreenSharingMessage = {
          type: ScreenSharingMessageType.UnknownType,
          flags: [],
          data: new Uint8Array([]),
        };
        const promisedWebSocket = new PromisedWebSocketMock();
        const subject = new DefaultScreenSharingSession(
          promisedWebSocket,
          constraintsProvider,
          timeSliceMs,
          messageSerialization,
          mediaStreamBroker,
          screenSharingStreamFactory,
          mediaRecordingFactory,
          logging
        );
        const observer: ScreenSharingSessionObserver = {
          didReceiveUnknownMessage(): void {
            done();
          },
        };
        messageSerialization.deserialize(Arg.any()).returns(message);
        subject
          .registerObserver(observer)
          .open(1000)
          .then(() => {
            const event = Substitute.for<MessageEvent>();
            event.type.returns('message');
            promisedWebSocket.dispatchEvent(event);
          });
        const event = Substitute.for<Event>();
        event.type.returns('open');
        promisedWebSocket.dispatchEvent(event);
      });
    });

    describe('with keyframe request', () => {
      it('is dispatched', () => {
        const stream = Substitute.for<ScreenShareStreaming>();
        const screenSharingStreamFactory = Substitute.for<ScreenShareStreamingFactory>();
        const mediaStreamBroker = Substitute.for<MediaStreamBroker>();
        const messageSerialization = Substitute.for<ScreenSharingMessageSerialization>();
        const message: ScreenSharingMessage = {
          type: ScreenSharingMessageType.KeyRequest,
          flags: [],
          data: new Uint8Array([]),
        };
        const promisedWebSocket = new PromisedWebSocketMock();
        const subject = new DefaultScreenSharingSession(
          promisedWebSocket,
          constraintsProvider,
          timeSliceMs,
          messageSerialization,
          mediaStreamBroker,
          screenSharingStreamFactory,
          mediaRecordingFactory,
          logging
        );
        stream.stop().returns(Promise.resolve());
        screenSharingStreamFactory.create(Arg.any()).returns(stream);
        messageSerialization.deserialize(Arg.any()).returns(message);
        mediaStreamBroker
          .acquireDisplayInputStream(Arg.any())
          .returns(Promise.resolve(Substitute.for<MediaStream>()));
        subject
          .open(1000)
          .then(() => {
            return subject.start(null, 0);
          })
          .then(() => {
            const event = Substitute.for<MessageEvent>();
            event.type.returns('message');
            promisedWebSocket.dispatchEvent(event);
          });
        const event = Substitute.for<Event>();
        event.type.returns('open');
        promisedWebSocket.dispatchEvent(event);
      });
    });

    describe('with heartbeat response', () => {
      it('is dispatched', (done: Mocha.Done) => {
        const mediaStreamBroker = Substitute.for<MediaStreamBroker>();
        const messageSerialization = Substitute.for<ScreenSharingMessageSerialization>();
        const message: ScreenSharingMessage = {
          type: ScreenSharingMessageType.HeartbeatResponseType,
          flags: [],
          data: new Uint8Array([]),
        };
        const observer: ScreenSharingSessionObserver = {
          didReceiveHeartbeatResponse(): void {
            done();
          },
        };
        const promisedWebSocket = new PromisedWebSocketMock();
        const subject = new DefaultScreenSharingSession(
          promisedWebSocket,
          constraintsProvider,
          timeSliceMs,
          messageSerialization,
          mediaStreamBroker,
          screenSharingStreamFactory,
          mediaRecordingFactory,
          logging
        );
        messageSerialization.deserialize(Arg.any()).returns(message);
        mediaStreamBroker
          .acquireDisplayInputStream(Arg.any())
          .returns(Promise.resolve(Substitute.for<MediaStream>()));
        subject
          .registerObserver(observer)
          .open(1000)
          .then(() => {
            return subject.start(null, 0);
          })
          .then(() => {
            const event = Substitute.for<MessageEvent>();
            event.type.returns('message');
            promisedWebSocket.dispatchEvent(event);
          });
        const event = Substitute.for<Event>();
        event.type.returns('open');
        promisedWebSocket.dispatchEvent(event);
      });
    });

    describe('with stream stop', () => {
      it('is dispatched', (done: Mocha.Done) => {
        const stream = Substitute.for<ScreenShareStreaming>();
        const screenSharingStreamFactory = Substitute.for<ScreenShareStreamingFactory>();
        const mediaStreamBroker = Substitute.for<MediaStreamBroker>();
        const messageSerialization = Substitute.for<ScreenSharingMessageSerialization>();
        const message: ScreenSharingMessage = {
          type: ScreenSharingMessageType.StreamStop,
          flags: [],
          data: new Uint8Array([]),
        };
        const observer: ScreenSharingSessionObserver = {
          didReceiveStreamStopMessage(): void {
            done();
          },
        };
        const promisedWebSocket = new PromisedWebSocketMock();
        const subject = new DefaultScreenSharingSession(
          promisedWebSocket,
          constraintsProvider,
          timeSliceMs,
          messageSerialization,
          mediaStreamBroker,
          screenSharingStreamFactory,
          mediaRecordingFactory,
          logging
        );
        stream.stop().returns(Promise.resolve());
        screenSharingStreamFactory.create(Arg.any()).returns(stream);
        messageSerialization.deserialize(Arg.any()).returns(message);
        mediaStreamBroker
          .acquireDisplayInputStream(Arg.any())
          .returns(Promise.resolve(Substitute.for<MediaStream>()));
        subject
          .registerObserver(observer)
          .open(1000)
          .then(() => {
            return subject.start(null, 0);
          })
          .then(() => {
            const event = Substitute.for<MessageEvent>();
            event.type.returns('message');
            promisedWebSocket.dispatchEvent(event);
          });
        const event = Substitute.for<Event>();
        event.type.returns('open');
        promisedWebSocket.dispatchEvent(event);
      });
    });

    describe('with heartbeat request', () => {
      describe('with send error', () => {
        it('is dispatched', (done: Mocha.Done) => {
          const messageSerialization = Substitute.for<ScreenSharingMessageSerialization>();
          const message: ScreenSharingMessage = {
            type: ScreenSharingMessageType.HeartbeatRequestType,
            flags: [],
            data: new Uint8Array([]),
          };
          messageSerialization.deserialize(Arg.any()).returns(message);
          const error = new Error();
          const promisedWebSocket = {
            ...Substitute.for<PromisedWebSocket>(),
            get callbacks(): Map<string, EventListener> {
              this._callbacks = this._callbacks || new Map<string, EventListener>();
              return this._callbacks;
            },
            dispatchEvent(event: Event): boolean {
              Maybe.of(this.callbacks.get(event.type)).map(listeners =>
                listeners.forEach((listener: EventListener) => listener(event))
              );
              return event.defaultPrevented;
            },
            addEventListener(type: string, listener: EventListener): void {
              Maybe.of(this.callbacks.get(type))
                .defaulting(new Set<EventListener>())
                .map(listeners => listeners.add(listener))
                .map(listeners => this.callbacks.set(type, listeners));
            },
            removeEventListener(type: string, listener: EventListener): void {
              Maybe.of(this.callbacks.get(type)).map(f => f.delete(listener));
            },
            open(_timeoutMs: number): Promise<Event> {
              return Promise.resolve(Substitute.for<Event>());
            },
            send(_data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
              throw error;
            },
          };
          const observer: ScreenSharingSessionObserver = {
            didFailSend(e: Error): void {
              chai.expect(e).to.eq(error);
              done();
            },
          };
          const subject = new DefaultScreenSharingSession(
            promisedWebSocket,
            constraintsProvider,
            timeSliceMs,
            messageSerialization,
            mediaStreamBroker,
            screenSharingStreamFactory,
            mediaRecordingFactory,
            logging
          );
          subject
            .registerObserver(observer)
            .open(1000)
            .then(() => {
              const event = Substitute.for<MessageEvent>();
              event.type.returns('message');
              promisedWebSocket.dispatchEvent(event);
            });
          const event = Substitute.for<Event>();
          event.type.returns('open');
          promisedWebSocket.dispatchEvent(event);
        });
      });

      it('is dispatched', (done: Mocha.Done) => {
        const messageSerialization = Substitute.for<ScreenSharingMessageSerialization>();
        const message: ScreenSharingMessage = {
          type: ScreenSharingMessageType.HeartbeatRequestType,
          flags: [],
          data: new Uint8Array([]),
        };
        const observer: ScreenSharingSessionObserver = {
          didSendHeartbeatResponse(): void {
            done();
          },
          didReceiveHeartbeatRequest(): void {},
          didSendScreenSharingMessage(): void {},
        };
        const promisedWebSocket = new PromisedWebSocketMock();
        const subject = new DefaultScreenSharingSession(
          promisedWebSocket,
          constraintsProvider,
          timeSliceMs,
          messageSerialization,
          mediaStreamBroker,
          screenSharingStreamFactory,
          mediaRecordingFactory,
          logging
        );
        messageSerialization.deserialize(Arg.any()).returns(message);
        subject
          .registerObserver(observer)
          .open(1000)
          .then(() => {
            const event = Substitute.for<MessageEvent>();
            event.type.returns('message');
            promisedWebSocket.dispatchEvent(event);
          });
        const event = Substitute.for<Event>();
        event.type.returns('open');
        promisedWebSocket.dispatchEvent(event);
      });
    });
  });

  describe('#registerObserver', () => {
    const observer = Substitute.for<ScreenSharingSessionObserver>();
    const promisedWebSocket = new PromisedWebSocketMock();
    const subject = new DefaultScreenSharingSession(
      promisedWebSocket,
      constraintsProvider,
      timeSliceMs,
      messageSerialization,
      mediaStreamBroker,
      screenSharingStreamFactory,
      mediaRecordingFactory,
      logging
    );

    describe('with existing observer', () => {
      before(() => {
        subject.registerObserver(observer);
      });

      it('is ScreenSharingSession', () => {
        subject.registerObserver(observer).should.eql(subject);
      });
    });

    describe('without existing', () => {
      it('is ScreenSharingSession', () => {
        subject.registerObserver(observer).should.eql(subject);
      });
    });
  });

  describe('#deregisterObserver', () => {
    const observer = Substitute.for<ScreenSharingSessionObserver>();
    const promisedWebSocket = Substitute.for<PromisedWebSocket>();
    const subject = new DefaultScreenSharingSession(
      promisedWebSocket,
      constraintsProvider,
      timeSliceMs,
      messageSerialization,
      mediaStreamBroker,
      screenSharingStreamFactory,
      mediaRecordingFactory,
      logging
    );

    describe('with existing observer', () => {
      before(() => {
        subject.registerObserver(observer);
      });

      it('is ScreenSharingSession', () => {
        subject.deregisterObserver(observer).should.eql(subject);
      });
    });

    describe('without existing observer', () => {
      it('is ScreenSharingSession', () => {
        subject.deregisterObserver(observer).should.eql(subject);
      });
    });
  });

  describe('reconnect error', () => {
    it('is dispatched', (done: Mocha.Done) => {
      const observer: ScreenSharingSessionObserver = {
        didFailReconnectAttempt(): void {
          done();
        },
      };
      const screenSharingStreamFactory = Substitute.for<ScreenShareStreamingFactory>();
      const screenSharingStream = Substitute.for<ScreenShareStreaming>();
      const promisedWebSocket = {
        ...Substitute.for<PromisedWebSocket>(),
        get callbacks(): Map<string, EventListener> {
          this._callbacks = this._callbacks || new Map<string, EventListener>();
          return this._callbacks;
        },
        dispatchEvent(event: Event): boolean {
          Maybe.of(this.callbacks.get(event.type)).map(listeners =>
            listeners.forEach((listener: EventListener) => listener(event))
          );
          return event.defaultPrevented;
        },
        addEventListener(type: string, listener: EventListener): void {
          Maybe.of(this.callbacks.get(type))
            .defaulting(new Set<EventListener>())
            .map(listeners => listeners.add(listener))
            .map(listeners => this.callbacks.set(type, listeners));
        },
        removeEventListener(type: string, listener: EventListener): void {
          Maybe.of(this.callbacks.get(type)).map(f => f.delete(listener));
        },
        open(_timeoutMs: number): Promise<Event> {
          return Promise.resolve(Substitute.for<Event>());
        },
      };
      const mediaStreamBroker = Substitute.for<MediaStreamBroker>();
      const subject = new DefaultScreenSharingSession(
        promisedWebSocket,
        constraintsProvider,
        timeSliceMs,
        messageSerialization,
        mediaStreamBroker,
        screenSharingStreamFactory,
        mediaRecordingFactory,
        logging
      );
      screenSharingStreamFactory.create(Arg.any()).returns(screenSharingStream);
      subject.registerObserver(observer);
      subject.open(100).then(() => {
        const event = Substitute.for<CustomEvent>();
        event.type.returns('reconnect_error');
        promisedWebSocket.dispatchEvent(event);
      });
    });
  });

  describe('ended', () => {
    it('is dispatched', (done: Mocha.Done) => {
      const observer: ScreenSharingSessionObserver = {
        didStopScreenSharing(): void {
          done();
        },
      };
      const screenSharingStreamFactory = Substitute.for<ScreenShareStreamingFactory>();
      const screenSharingStream: ScreenShareStreaming = {
        ...Substitute.for<ScreenShareStreaming>(),
        get listeners() {
          this._listeners = this._listeners || new Map<string, Set<EventListener>>();
          return this._listeners;
        },
        start(_timeSliceMs: number): ScreenSharingMessage {
          return Substitute.for<ScreenSharingMessage>();
        },
        stop(): Promise<void> {
          return Promise.resolve();
        },
        addEventListener(type: string, listener: EventListener): void {
          if (!this.listeners.get(type)) {
            this.listeners.set(type, new Set<EventListener>());
          }
          this.listeners.get(type).add(listener);
        },
        dispatchEvent(event: Event): boolean {
          if (this.listeners.get(event.type) !== null) {
            this.listeners.get(event.type).forEach((listener: EventListener) => {
              listener(event);
            });
          }
          return event.defaultPrevented;
        },
      };
      const promisedWebSocket = Substitute.for<PromisedWebSocket>();
      const mediaStreamBroker = Substitute.for<MediaStreamBroker>();
      const subject = new DefaultScreenSharingSession(
        promisedWebSocket,
        constraintsProvider,
        timeSliceMs,
        messageSerialization,
        mediaStreamBroker,
        screenSharingStreamFactory,
        mediaRecordingFactory,
        logging
      );
      screenSharingStreamFactory.create(Arg.any()).returns(screenSharingStream);
      mediaStreamBroker
        .acquireDisplayInputStream(Arg.any())
        .returns(Promise.resolve(Substitute.for<MediaStream>()));
      subject.registerObserver(observer);
      subject.start(null, 0).then(() => {
        const event = Substitute.for<Event>();
        event.type.returns('ended');
        screenSharingStream.dispatchEvent(event);
      });
    });
  });

  describe('pause and unpause', () => {
    describe('with start', () => {
      it('is fulfilled', (done: Mocha.Done) => {
        const observer = Substitute.for<ScreenSharingSessionObserver>();
        const promisedWebSocket = Substitute.for<PromisedWebSocket>();
        const mediaStreamBroker = Substitute.for<MediaStreamBroker>();
        const stream = new ScreenShareStreamingMock();
        const screenSharingStreamFactory = Substitute.for<ScreenShareStreamingFactory>();
        const subject = new DefaultScreenSharingSession(
          promisedWebSocket,
          constraintsProvider,
          timeSliceMs,
          messageSerialization,
          mediaStreamBroker,
          screenSharingStreamFactory,
          mediaRecordingFactory,
          logging
        ).registerObserver(observer);
        screenSharingStreamFactory.create(Arg.any()).returns(stream);
        mediaStreamBroker
          .acquireDisplayInputStream(Arg.any())
          .returns(Promise.resolve(Substitute.for<MediaStream>()));
        subject.start(null, 0).then(() => {
          subject.pause().should.eventually.be.fulfilled.and.notify(() => {
            observer.received().didPauseScreenSharing();
          });
          subject.unpause().should.eventually.be.fulfilled.and.notify(() => {
            observer.received().didUnpauseScreenSharing();
            done();
          });
        });
      });
    });

    describe('without start', () => {
      it('is rejected', (done: Mocha.Done) => {
        const promisedWebSocket = new DefaultPromisedWebSocket(Substitute.for<DOMWebSocket>());
        const subject = new DefaultScreenSharingSession(
          promisedWebSocket,
          constraintsProvider,
          timeSliceMs,
          messageSerialization,
          mediaStreamBroker,
          screenSharingStreamFactory,
          mediaRecordingFactory,
          logging
        );
        subject.pause().should.eventually.be.rejected;
        subject.unpause().should.eventually.be.rejected.and.notify(done);
      });
    });
  });
});
