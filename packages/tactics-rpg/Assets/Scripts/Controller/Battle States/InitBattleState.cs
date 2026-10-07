using UnityEngine;
using System.Collections;
using System.Collections.Generic;

public class InitBattleState : BattleState 
{
	public override void Enter ()
	{
		base.Enter ();
		StartCoroutine(Init());
	}
	
	IEnumerator Init ()
	{
		board.Load( levelData );
		Point p = new Point((int)levelData.tiles[0].x, (int)levelData.tiles[0].z);
		SelectTile(p);
		SpawnTestUnits();
		AddVictoryCondition();
		owner.round = owner.gameObject.AddComponent<TurnOrderController>().Round();
		yield return null;
		owner.ChangeState<CutSceneState>();
	}
	
	void SpawnTestUnits ()
	{
		string[] recipes = new string[]
		{
			"Alaois",
			"Hania",
			"Kamau",
			"Enemy Rogue",
			"Enemy Warrior",
			"Enemy Wizard"
		};
		
		GameObject unitContainer = new GameObject("Units");
		unitContainer.transform.SetParent(owner.transform);
		
		List<Tile> locations = new List<Tile>(board.tiles.Values);
		for (int i = 0; i < recipes.Length; ++i)
		{
			int level = UnityEngine.Random.Range(9, 12);
			GameObject instance = UnitFactory.Create(recipes[i], level);
			instance.transform.SetParent(unitContainer.transform);
			
			int random = UnityEngine.Random.Range(0, locations.Count);
			Tile randomTile = locations[ random ];
			locations.RemoveAt(random);
			
			Unit unit = instance.GetComponent<Unit>();
			unit.Place( randomTile );
			unit.dir = (Directions)UnityEngine.Random.Range(0, 4);
			unit.Match();
			
			units.Add(unit);
		}
		
		SelectTile(units[0].tile.pos);
	}
	
	void AddVictoryCondition ()
	{
		DefeatTargetVictoryCondition vc = owner.gameObject.AddComponent<DefeatTargetVictoryCondition>();
		Unit enemy = units[ units.Count - 1 ];
		vc.target = enemy;
		Health health = enemy.GetComponent<Health>();
		health.MinHP = 10;
	}
}