import { getCanEditCertificate } from './selectors';

const stateWith = (certificatesData) => ({ certificates: { certificatesData } });

describe('getCanEditCertificate', () => {
  it.each([
    [true, true, true],
    [true, false, true],
    [false, false, true],
    [false, true, false],
    [undefined, true, false],
    [undefined, false, true],
    [undefined, undefined, true],
  ])('with isGlobalStaff=%s and isActive=%s returns %s', (isGlobalStaff, isActive, expected) => {
    expect(getCanEditCertificate(stateWith({ isGlobalStaff, isActive }))).toBe(expected);
  });
});
