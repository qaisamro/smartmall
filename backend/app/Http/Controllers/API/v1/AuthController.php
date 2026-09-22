<?php

namespace App\Http\Controllers\API\v1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Normalize a phone number: trim + remove spaces, parens and dashes.
     */
    public static function normalizePhone(?string $phone): ?string
    {
        if ($phone === null) return null;
        $normalized = preg_replace('/[\s\(\)\-]/', '', trim($phone));
        return $normalized === '' ? null : $normalized;
    }

    public function register(Request $request)
    {
        $rawRegPhone = $request->input('phone');
        $request->merge([
            'email' => $request->filled('email') ? trim($request->email) : null,
            'phone' => self::normalizePhone(is_string($rawRegPhone) ? $rawRegPhone : null),
        ]);

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|string|email|max:255|unique:users',
            'phone' => 'required_without:email|nullable|string|regex:/^\+?[0-9]{7,15}$/|unique:users,phone',
            'password' => 'required|string|min:8|confirmed',
            'role' => 'required|string|in:customer,mall-owner'
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->input('email') ?: null,
            'phone' => $request->input('phone') ?: null,
            'password' => Hash::make($request->password),
        ]);

        $user->assignRole($request->role);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user->load('roles')
        ]);
    }

    public function login(Request $request)
    {
        $rawPhone = $request->input('phone');
        $request->merge([
            'phone' => self::normalizePhone(is_string($rawPhone) ? $rawPhone : null),
        ]);

        $request->validate([
            'email' => 'required_without:phone|nullable|email',
            'phone' => 'required_without:email|nullable|string',
            'password' => 'required',
        ]);

        if ($request->filled('phone')) {
            $user = User::where('phone', $request->phone)->first();
            // Legacy fallback: numbers stored before normalization
            if (!$user && is_string($rawPhone) && trim($rawPhone) !== $request->phone) {
                $user = User::where('phone', trim($rawPhone))->first();
            }
            $failedField = 'phone';
        } else {
            $user = User::where('email', $request->email)->first();
            $failedField = 'email';
        }

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                $failedField => [__('auth.failed')],
            ]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => $user->load('roles', 'mall')
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out successfully']);
    }

    public function me(Request $request)
    {
        return response()->json($request->user()->load('roles', 'mall'));
    }
}
