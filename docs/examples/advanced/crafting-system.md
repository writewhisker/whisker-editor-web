# Crafting System

Combine items to create new ones.

## Code

```whisker
@title: The Alchemist

:: Start
{do $materials = {
  herb: 5,
  mushroom: 3,
  crystal: 2,
  water: 10
}}

{do $potions = {
  health: 0,
  mana: 0,
  strength: 0
}}

{do $recipes = [
  { name: "Health Potion", result: "health", needs: { herb: 2, water: 1 } },
  { name: "Mana Potion", result: "mana", needs: { mushroom: 2, water: 1 } },
  { name: "Strength Potion", result: "strength", needs: { herb: 1, mushroom: 1, crystal: 1 } }
]}

**The Alchemist's Workshop**

-> Workshop

:: Workshop
**Materials:**
- Herbs: $materials.herb
- Mushrooms: $materials.mushroom
- Crystals: $materials.crystal
- Water: $materials.water

**Potions:**
- Health: $potions.health
- Mana: $potions.mana
- Strength: $potions.strength

+ [Craft potions] -> CraftMenu
+ [Gather materials] -> Gather
+ [Use a potion] -> UsePotion
+ [Exit] -> END

:: CraftMenu
**Recipes:**

+ [Health Potion (2 herb, 1 water)] {$materials.herb >= 2 and $materials.water >= 1} -> CraftHealth
+ [Mana Potion (2 mushroom, 1 water)] {$materials.mushroom >= 2 and $materials.water >= 1} -> CraftMana
+ [Strength Potion (1 herb, 1 mushroom, 1 crystal)] {$materials.herb >= 1 and $materials.mushroom >= 1 and $materials.crystal >= 1} -> CraftStrength
+ [Back] -> Workshop

:: CraftHealth
{do $materials.herb = $materials.herb - 2}
{do $materials.water = $materials.water - 1}
{do $potions.health = $potions.health + 1}

*You mix the herbs with water...*
**Created a Health Potion!**

-> CraftMenu

:: CraftMana
{do $materials.mushroom = $materials.mushroom - 2}
{do $materials.water = $materials.water - 1}
{do $potions.mana = $potions.mana + 1}

*The mushrooms dissolve into the water...*
**Created a Mana Potion!**

-> CraftMenu

:: CraftStrength
{do $materials.herb = $materials.herb - 1}
{do $materials.mushroom = $materials.mushroom - 1}
{do $materials.crystal = $materials.crystal - 1}
{do $potions.strength = $potions.strength + 1}

*The crystal glows as it absorbs the essence...*
**Created a Strength Potion!**

-> CraftMenu

:: Gather
**Gathering Materials...**

{do $type = random(1, 4)}

{$type == 1}
You found some herbs!
{do $materials.herb = $materials.herb + random(1, 3)}
{elif $type == 2}
You found some mushrooms!
{do $materials.mushroom = $materials.mushroom + random(1, 2)}
{elif $type == 3}
You found a crystal!
{do $materials.crystal = $materials.crystal + 1}
{else}
You found a water source!
{do $materials.water = $materials.water + random(2, 4)}
{/}

+ [Gather more] -> Gather
+ [Back to workshop] -> Workshop

:: UsePotion
**Use which potion?**

+ [Health Potion] {$potions.health > 0} -> DrinkHealth
+ [Mana Potion] {$potions.mana > 0} -> DrinkMana
+ [Strength Potion] {$potions.strength > 0} -> DrinkStrength
+ [Back] -> Workshop

:: DrinkHealth
{do $potions.health = $potions.health - 1}
*Gulp!*
You feel healthier!
-> Workshop

:: DrinkMana
{do $potions.mana = $potions.mana - 1}
*Gulp!*
Your mind feels clearer!
-> Workshop

:: DrinkStrength
{do $potions.strength = $potions.strength - 1}
*Gulp!*
Your muscles surge with power!
-> Workshop
```

## What This Shows

- Recipe system with multiple ingredients
- Material inventory tracking
- Conditional crafting based on materials
- Resource gathering mechanics
- Consuming crafted items
