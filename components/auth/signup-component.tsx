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

export default function SignupComponent() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        email: "",
        username: "",
        password: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            await authClient.signUp.email({
                email: formData.email,
                password: formData.password,
                name: formData.username,
            });
            console.log("Signup successful");
            router.push("/sign-in");
        } catch (error) {
            console.error("Signup failed:", error);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-center">Create an Account</CardTitle>
                    <CardDescription className="text-center">
                        Sign up with your details below
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form onSubmit={handleSubmit} className="grid gap-4">
                        {/* Username */}

                        <div className="grid gap-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                                id="username"
                                name="username"
                                type="text"
                                placeholder="Enter a username"
                                required
                                onChange={handleChange}
                                value={formData.username}
                            />
                        </div>
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
                            Sign Up
                        </Button>
                    </form>
                </CardContent>

                <CardFooter className="text-sm text-center w-full flex justify-center">
                    Already have an account?
                    <a href="/login" className="ml-1 text-blue-600 hover:underline">
                        Login
                    </a>
                </CardFooter>
            </Card>
        </div>
    );
}
