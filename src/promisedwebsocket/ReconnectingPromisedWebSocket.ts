// Copyright 2019-2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import Backoff from '../backoff/Backoff';
import Maybe from '../maybe/Maybe';
import TimeoutScheduler from '../scheduler/TimeoutScheduler';
import PromisedWebSocket from './PromisedWebSocket';
import PromisedWebSocketClosureCode from './PromisedWebSocketClosureCode';
import PromisedWebSocketFactory from './PromisedWebSocketFactory';

export default class ReconnectingPromisedWebSocket implements PromisedWebSocket {
  private static normalClosureCodes = Array.of(
    PromisedWebSocketClosureCode.Normal,
    PromisedWebSocketClosureCode.EmptyCloseFrame
  );
  private callbacks = new Map<string, Set<EventListener>>();
  private timeoutScheduler: TimeoutScheduler | null = null;
  private webSocket: PromisedWebSocket | null = null;

  constructor(
    readonly url: string,
    private protocols: string | string[],
    private binaryType: BinaryType,
    private webSocketFactory: PromisedWebSocketFactory,
    private backoff: Backoff
  ) {}

  async close(timeoutMs: number, code?: number, reason?: string): Promise<Event> {
    if (this.webSocket === null) {
      return Promise.reject(new Error('closed'));
    }
    this.willCloseWebSocket();
    const webSocket = this.webSocket;
    this.webSocket = null;
    return webSocket.close(timeoutMs, code, reason);
  }

  async open(timeoutMs: number): Promise<Event> {
    if (this.webSocket !== null) {
      return Promise.reject(new Error('opened'));
    }

    this.webSocket = this.webSocketFactory.create(this.url, this.protocols, this.binaryType);

    this.webSocket.addEventListener('close', (event: CloseEvent) => {
      if (ReconnectingPromisedWebSocket.normalClosureCodes.indexOf(event.code) <= -1) {
        try {
          const timeout = this.backoff.nextBackoffAmountMs();
          this.timeoutScheduler = new TimeoutScheduler(timeout);
          this.timeoutScheduler.start(() => {
            this.timeoutScheduler.stop();
            this.open(timeoutMs)
              .catch((error: ErrorEvent) => {
                this.dispatchEvent(new CustomEvent('reconnect_error', { detail: error }));
              })
              .then(() => {});
          });
          this.dispatchEvent(new CustomEvent('reconnect'));
        } catch (e) {
          this.dispatchEvent(event);
        }
      } else {
        this.dispatchEvent(event);
      }
      this.webSocket = null;
    });

    this.webSocket.addEventListener('message', (event: MessageEvent) => {
      this.dispatchEvent(event);
    });

    this.webSocket.addEventListener('open', (event: Event) => {
      this.didOpenWebSocket();
      this.dispatchEvent(event);
    });

    return this.webSocket.open(timeoutMs).catch(error => {
      this.webSocket = null;
      throw error;
    });
  }

  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
    if (this.webSocket === null) {
      throw new Error('closed');
    }
    this.webSocket.send(data);
  }

  dispatchEvent(event: Event): boolean {
    Maybe.of(this.callbacks.get(event.type)).map(listeners =>
      listeners.forEach(listener => listener(event))
    );
    return event.defaultPrevented;
  }

  addEventListener(type: string, listener: EventListener): void {
    Maybe.of(this.callbacks.get(type))
      .defaulting(new Set<EventListener>())
      .map(listeners => listeners.add(listener))
      .map(listeners => this.callbacks.set(type, listeners));
  }

  removeEventListener(type: string, listener: EventListener): void {
    Maybe.of(this.callbacks.get(type)).map(f => f.delete(listener));
  }

  private didOpenWebSocket(): void {
    Maybe.of(this.timeoutScheduler).map(scheduler => scheduler.stop());
    this.backoff.reset();
    this.timeoutScheduler = null;
  }

  private willCloseWebSocket(): void {
    this.didOpenWebSocket();
  }
}
