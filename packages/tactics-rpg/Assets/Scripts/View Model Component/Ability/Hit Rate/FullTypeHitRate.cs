using UnityEngine;
using System.Collections;

public class FullTypeHitRate : HitRate 
{
	public override bool IsAngleBased { get { return false; }}

	public override int Calculate (Tile target)
	{
		Unit defender = target.content.GetComponent<Unit>();
		if (AutomaticMiss(defender))
			return Final(100);

		return Final (0);
	}
}