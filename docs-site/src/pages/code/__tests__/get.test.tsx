import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import React from 'react';
import {render, screen} from '@testing-library/react';

vi.mock('../../../data/specwithcodeMobile', async importOriginal => ({
  ...(await importOriginal<typeof import('../../../data/specwithcodeMobile')>()),
  openPhoneStore: vi.fn(),
}));

import CodeGet from '../get';
import {SPECWITHCODE_MOBILE, openPhoneStore, phoneStoreFor} from '../../../data/specwithcodeMobile';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 19_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Mobile/15E148 Safari/604.1';
const ANDROID = 'Mozilla/5.0 (Linux; Android 16; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36';
const MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.0 Safari/605.1.15';
const WINDOWS = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';

function browser(userAgent: string, maxTouchPoints = 0) {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(userAgent);
  // jsdom has no touch screen, so the property is set rather than spied on.
  Object.defineProperty(navigator, 'maxTouchPoints', {configurable: true, value: maxTouchPoints});
}

beforeEach(() => vi.mocked(openPhoneStore).mockClear());
afterEach(() => vi.restoreAllMocks());

describe('phoneStoreFor', () => {
  it('sends an iPhone and an iPad to the App Store, and Android to Google Play', () => {
    expect(phoneStoreFor(IPHONE, 5)).toBe('ios');
    expect(phoneStoreFor(ANDROID, 5)).toBe('android');
    expect(phoneStoreFor(IPHONE.replace('iPhone;', 'iPad;'), 5)).toBe('ios');
  });

  it('knows an iPad that asks for desktop sites from a Mac by its touch screen', () => {
    expect(phoneStoreFor(MAC, 5)).toBe('ios');
    expect(phoneStoreFor(MAC, 0)).toBeNull();
    expect(phoneStoreFor(MAC)).toBeNull();
  });

  it('sends a computer nowhere', () => {
    expect(phoneStoreFor(WINDOWS, 0)).toBeNull();
    // A Windows laptop with a touch screen is still a computer.
    expect(phoneStoreFor(WINDOWS, 10)).toBeNull();
    expect(phoneStoreFor('')).toBeNull();
  });
});

describe('the get page', () => {
  it('opens the App Store on an iPhone and says so', () => {
    browser(IPHONE, 5);
    render(<CodeGet />);
    expect(openPhoneStore).toHaveBeenCalledTimes(1);
    expect(openPhoneStore).toHaveBeenCalledWith(SPECWITHCODE_MOBILE.ios.url);
    expect(screen.getByRole('status')).toHaveTextContent('Opening the App Store…');
  });

  it('opens Google Play on an Android phone and says so', () => {
    browser(ANDROID, 5);
    render(<CodeGet />);
    expect(openPhoneStore).toHaveBeenCalledWith(SPECWITHCODE_MOBILE.android.url);
    expect(screen.getByRole('status')).toHaveTextContent('Opening Google Play…');
  });

  it('stays on a computer and offers both stores and the desktop download', () => {
    browser(MAC, 0);
    render(<CodeGet />);
    expect(openPhoneStore).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', {level: 1})).toHaveTextContent('Get SpecWithCode on your phone');
    expect(screen.getByRole('link', {name: /App Store/})).toHaveAttribute('href', SPECWITHCODE_MOBILE.ios.url);
    expect(screen.getByRole('link', {name: /Google Play/})).toHaveAttribute('href', SPECWITHCODE_MOBILE.android.url);
    expect(screen.getByRole('link', {name: 'Download SpecWithCode for Mac, Windows and Linux'})).toHaveAttribute('href', '/code/download/');
  });

  it('keeps both store cards on a phone, for when the store does not open', () => {
    browser(IPHONE, 5);
    render(<CodeGet />);
    expect(screen.getByRole('link', {name: /App Store/})).toBeInTheDocument();
    expect(screen.getByRole('link', {name: /Google Play/})).toBeInTheDocument();
  });
});
