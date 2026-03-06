/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            colors: {
                primary: {
                    50: '#f0f6fa',
                    100: '#dbeaf3',
                    200: '#bbd7e9',
                    300: '#8ebfda',
                    400: '#5ba2c8',
                    500: '#3888b1',
                    600: '#276c91',
                    700: '#1f5675',
                    800: '#0b538d',
                    900: '#093f6b',
                    950: '#062847',
                },
                indigo: {
                    50: '#f0f6fa',
                    100: '#dbeaf3',
                    200: '#bbd7e9',
                    300: '#8ebfda',
                    400: '#5ba2c8',
                    500: '#3888b1',
                    600: '#276c91',
                    700: '#1f5675',
                    800: '#0b538d',
                    900: '#093f6b',
                    950: '#062847',
                },
            },
        },
    },
    plugins: [],
}
