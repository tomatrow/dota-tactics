using UnityEngine;
using System.Collections;

public class EnemyAbilityEffectTarget : AbilityEffectTarget 
{
	Alliance alliance;

	void Start ()
	{
		alliance = GetComponentInParent<Alliance>();
	}

	public override bool IsTarget (Tile tile)
	{
		if (tile == null || tile.content == null)
			return false;

		Alliance other = tile.content.GetComponentInChildren<Alliance>();
		return alliance.IsMatch(other, Targets.Foe);
	}
}