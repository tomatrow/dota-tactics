using UnityEngine;
using System.Collections;
using System.Collections.Generic;

public class SelfAbilityRange : AbilityRange 
{
	public override bool positionOriented { get { return false; }}

	public override List<Tile> GetTilesInRange (Board board)
	{
		List<Tile> retValue = new List<Tile>(1);
		retValue.Add(unit.tile);
		return retValue;
	}
}