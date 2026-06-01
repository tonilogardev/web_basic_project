import { Request, Response } from 'express';
import { UnitOfWork } from '../../domain/repositories/UnitOfWork';

export class AssetController {
  // Inicializamos el patrón Unit Of Work en lugar del repositorio directamente
  private uow = new UnitOfWork();

  getAll = async (req: Request, res: Response) => {
    try {
      const assets = await this.uow.assets.findAll();
      res.status(200).json(assets);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  getById = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
      const asset = await this.uow.assets.findById(id);
      if (!asset) return res.status(404).json({ error: 'Activo no encontrado' });
      res.status(200).json(asset);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const { name, latitude, longitude, category_id, base_value, hazard_id, exposure_value, condition_id } = req.body;

      const hazard = hazard_id && exposure_value ? { id: parseInt(hazard_id), value: parseFloat(exposure_value) } : undefined;
      const condition = condition_id ? parseInt(condition_id) : undefined;

      const newAsset = await this.uow.assets.create(
        { name, latitude, longitude, category_id, base_value },
        hazard,
        condition
      );

      // Simulamos confirmación del UnitOfWork
      await this.uow.commit();

      res.status(201).json(newAsset);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  update = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
      const updatedAsset = await this.uow.assets.update(id, req.body);

      await this.uow.commit();

      res.status(200).json(updatedAsset);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id as string, 10);
      if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
      await this.uow.assets.delete(id);

      await this.uow.commit();

      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  getTotalExposure = async (req: Request, res: Response) => {
    try {
      const total = await this.uow.assets.getTotalExposure();
      res.status(200).json({ totalExposure: total });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
}
