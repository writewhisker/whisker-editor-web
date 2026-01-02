# Yes/No Questions

Handle binary choices with variables.

## Code

```whisker
@title: The Interview

:: Start
{do $likeCoffee = false}
{do $morning = false}
{do $remote = false}

**Job Interview**

Please answer a few questions:

+ [Begin interview] -> Question1

:: Question1
Do you like coffee?

+ [Yes] {do $likeCoffee = true} -> Question2
+ [No] -> Question2

:: Question2
Are you a morning person?

+ [Yes] {do $morning = true} -> Question3
+ [No] -> Question3

:: Question3
Do you prefer remote work?

+ [Yes] {do $remote = true} -> Results
+ [No] -> Results

:: Results
**Interview Complete**

Based on your answers:

{$likeCoffee}
☕ You'll fit right in with our coffee culture!
{/}

{$morning}
🌅 Great! We start early around here.
{else}
🌙 Don't worry, we have flexible hours.
{/}

{$remote}
🏠 We offer remote work options.
{else}
🏢 You'll enjoy our office space.
{/}

**Overall Assessment:**
{$likeCoffee and $morning}
You're a perfect fit for our team!
{elif $likeCoffee or $morning}
You'll do well here.
{else}
We appreciate your honesty!
{/}

+ [Try again] -> Start
+ [Exit] -> END
```

## What This Shows

- Boolean variables for yes/no tracking
- Setting variables in choices
- Logical operators (`and`, `or`)
- Building results from multiple answers
