using UnityEngine;
using System.Collections;

public class EndBattleState : BattleState 
{
	public override void Enter ()
	{
		base.Enter ();
		Application.LoadLevel(0);
	}
}
