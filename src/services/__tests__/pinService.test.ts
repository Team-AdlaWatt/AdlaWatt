import {
  getAuthenticatedUserSafe,
  supabase,
} from "@/lib/supabase";
import {
  updateMyTftPin,
  verifyPinPassword,
} from "@/services/pinService";

jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      signInWithPassword: jest.fn(),
    },
    from: jest.fn(),
  },
  getAuthenticatedUserSafe: jest.fn(),
}));

jest.mock("@/services/i18n", () => ({
  __esModule: true,
  default: {
    t: (key: string) => key,
  },
}));

const mockedFrom = supabase.from as jest.Mock;
const mockedSignInWithPassword =
  supabase.auth.signInWithPassword as jest.Mock;
const mockedGetAuthenticatedUserSafe =
  getAuthenticatedUserSafe as jest.Mock;

const single = jest.fn();
const select = jest.fn(() => ({ single }));
const eq = jest.fn(() => ({ select }));
const update = jest.fn(() => ({ eq }));

const mockUser = {
  id: "user-1",
  email: "user@example.com",
};

describe("pinService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetAuthenticatedUserSafe.mockResolvedValue(mockUser);
    mockedFrom.mockReturnValue({ update });
    single.mockResolvedValue({
      data: { tft_pin: "4829" },
      error: null,
    });
  });

  it("updates the authenticated user's PIN", async () => {
    const result = await updateMyTftPin("4829");

    expect(result).toEqual({
      success: true,
      pin: "4829",
    });
    expect(mockedFrom).toHaveBeenCalledWith("users");
    expect(update).toHaveBeenCalledWith({
      tft_pin: "4829",
    });
    expect(eq).toHaveBeenCalledWith("id", mockUser.id);
  });

  it("maps a unique violation to pinAlreadyUsed", async () => {
    single.mockResolvedValue({
      data: null,
      error: {
        code: "23505",
        message:
          'duplicate key value violates unique constraint "users_tft_pin_key"',
      },
    });

    const result = await updateMyTftPin("4829");

    expect(result).toEqual({
      success: false,
      error: "validation.pinAlreadyUsed",
    });
  });

  it("maps a weak PIN constraint to pinWeak", async () => {
    single.mockResolvedValue({
      data: null,
      error: {
        code: "23514",
        message:
          'new row violates check constraint "users_tft_pin_not_weak_check"',
      },
    });

    const result = await updateMyTftPin("1234");

    expect(result).toEqual({
      success: false,
      error: "validation.pinWeak",
    });
  });

  it("rejects an invalid PIN before any database write", async () => {
    const result = await updateMyTftPin("12");

    expect(result).toEqual({
      success: false,
      error: "validation.pinLength",
    });
    expect(mockedFrom).not.toHaveBeenCalled();
  });

  it("requires an authenticated user", async () => {
    mockedGetAuthenticatedUserSafe.mockResolvedValue(null);

    const result = await updateMyTftPin("4829");

    expect(result).toEqual({
      success: false,
      error: "common.authRequired",
    });
    expect(mockedFrom).not.toHaveBeenCalled();
  });

  it("verifies the account password", async () => {
    mockedSignInWithPassword.mockResolvedValue({
      error: null,
    });

    const result = await verifyPinPassword("password123");

    expect(result).toEqual({ success: true });
    expect(mockedSignInWithPassword).toHaveBeenCalledWith({
      email: mockUser.email,
      password: "password123",
    });
  });

  it("rejects a wrong account password", async () => {
    mockedSignInWithPassword.mockResolvedValue({
      error: new Error("invalid"),
    });

    const result = await verifyPinPassword("wrong");

    expect(result).toEqual({
      success: false,
      error: "pin.passwordInvalid",
    });
  });
});
