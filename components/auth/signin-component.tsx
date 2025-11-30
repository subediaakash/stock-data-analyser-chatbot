"use client";

import * as React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
    CardDescription,
    CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation"; 

export default function SigninComponent() {
    const router = useRouter(); 

    const [formData, setFormData] = useState({
        email: "",
        password: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            await authClient.signIn.email({
                email: formData.email,
                password: formData.password,
            });
            console.log("Sign In successful");
            router.push("/dashboard");
        } catch (error) {
            console.error("Sign In failed:", error);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-center">Welcome Back</CardTitle>
                    <CardDescription className="text-center">
                        Sign in to your account
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit} className="grid gap-4">

                        {/* Email */}
                        <div className="grid gap-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="you@example.com"
                                required
                                onChange={handleChange}
                                value={formData.email}
                            />
                        </div>

                        {/* Password */}
                        <div className="grid gap-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                placeholder="●●●●●●●●"
                                required
                                onChange={handleChange}
                                value={formData.password}
                            />
                        </div>

                        <Button type="submit" className="w-full">
                            Sign In
                        </Button>
                    </form>
                </CardContent>

                <CardFooter className="text-sm text-center w-full flex flex-col gap-2">
                    <a href="/forgot-password" className="text-blue-600 hover:underline">
                        Forgot password?
                    </a>
                    <p>
                        Don’t have an account?{" "}
                        <a href="/sign-up" className="text-blue-600 hover:underline">
                            Sign Up
                        </a>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
