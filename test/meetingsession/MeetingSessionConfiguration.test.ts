// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import * as chai from 'chai';

import MeetingSessionConfiguration from '../../src/meetingsession/MeetingSessionConfiguration';
import DOMMockBuilder from '../dommock/DOMMockBuilder';

describe('MeetingSessionConfiguration', () => {
  const expect: Chai.ExpectStatic = chai.expect;

  describe('constructor', () => {
    it('can take no arguments', () => {
      const configuration = new MeetingSessionConfiguration();
      expect(configuration.credentials).to.be.null;
      expect(configuration.meetingId).to.be.null;
      expect(configuration.urls).to.be.null;
    });

    it('can take a CreateMeeting and CreateAttendee response object', () => {
      const configuration = new MeetingSessionConfiguration(
        {
          MeetingId: 'meeting-id',
          MediaPlacement: {
            AudioHostUrl: 'audio-host-url',
            ScreenDataUrl: 'screen-data-url',
            ScreenSharingUrl: 'screen-sharing-url',
            ScreenViewingUrl: 'screen-viewing-url',
            SignalingUrl: 'signaling-url',
            TurnControlUrl: 'turn-control-url',
          },
        },
        {
          AttendeeId: 'attendee-id',
          JoinToken: 'join-token',
        }
      );
      expect(configuration.meetingId).to.eq('meeting-id');
      expect(configuration.urls.audioHostURL).to.eq('audio-host-url');
      expect(configuration.urls.screenDataURL).to.eq('screen-data-url');
      expect(configuration.urls.screenSharingURL).to.eq('screen-sharing-url');
      expect(configuration.urls.screenViewingURL).to.eq('screen-viewing-url');
      expect(configuration.urls.signalingURL).to.eq('signaling-url');
      expect(configuration.urls.turnControlURL).to.eq('turn-control-url');
      expect(configuration.credentials.attendeeId).to.eq('attendee-id');
      expect(configuration.credentials.joinToken).to.eq('join-token');
    });

    it('can take a CreateMeeting and CreateAttendee response object root-level values', () => {
      const configuration = new MeetingSessionConfiguration(
        {
          Meeting: {
            MeetingId: 'meeting-id',
            MediaPlacement: {
              AudioHostUrl: 'audio-host-url',
              ScreenDataUrl: 'screen-data-url',
              ScreenSharingUrl: 'screen-sharing-url',
              ScreenViewingUrl: 'screen-viewing-url',
              SignalingUrl: 'signaling-url',
              TurnControlUrl: 'turn-control-url',
            },
          },
        },
        {
          Attendee: {
            AttendeeId: 'attendee-id',
            JoinToken: 'join-token',
          },
        }
      );
      expect(configuration.meetingId).to.eq('meeting-id');
      expect(configuration.urls.audioHostURL).to.eq('audio-host-url');
      expect(configuration.urls.screenDataURL).to.eq('screen-data-url');
      expect(configuration.urls.screenSharingURL).to.eq('screen-sharing-url');
      expect(configuration.urls.screenViewingURL).to.eq('screen-viewing-url');
      expect(configuration.urls.signalingURL).to.eq('signaling-url');
      expect(configuration.urls.turnControlURL).to.eq('turn-control-url');
      expect(configuration.credentials.attendeeId).to.eq('attendee-id');
      expect(configuration.credentials.joinToken).to.eq('join-token');
    });

    it('can will automatically set the screen sharing bitrate for Firefox', () => {
      const dommock = new DOMMockBuilder();
      // @ts-ignore
      navigator.userAgent =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.12; rv:68.0) Gecko/20100101 Firefox/68.0';
      const configuration = new MeetingSessionConfiguration();
      expect(configuration.screenSharingSessionOptions.bitRate).to.eq(384000);
      dommock.cleanup();
    });
  });
});
